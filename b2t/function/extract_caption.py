#@title Imports

import clip
import os
from torch import nn
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as nnf
from torchvision import transforms
from typing import Tuple, List, Union, Optional
from transformers import GPT2Tokenizer, GPT2LMHeadModel

import skimage.io as io
from PIL import Image

# fix random seed for reproducibility
seed_value = 42
np.random.seed(seed_value)  # Numpy module
torch.manual_seed(seed_value)  # PyTorch
if torch.cuda.is_available():
    torch.cuda.manual_seed(seed_value)  # PyTorch for GPU
    torch.cuda.manual_seed_all(seed_value)  # if you are using multi-GPU.
    torch.backends.cudnn.deterministic = True  # Fixes the backend CUDNN
    torch.backends.cudnn.benchmark = False



# MODEL = "blip"  # "clip" or "blip"


def get_device(device_id: int) -> torch.device:
    if not torch.cuda.is_available():
        return torch.device('cpu')
    device_id = min(torch.cuda.device_count() - 1, device_id)
    return torch.device(f'cuda:{device_id}')



# current_directory = os.getcwd()
# save_path = os.path.join(os.path.dirname(current_directory), "pretrained_models")
# os.makedirs(save_path, exist_ok=True)

#@title Model

T = torch.Tensor

# class MLP(nn.Module):

#     def forward(self, x: T) -> T:
#         return self.model(x)

#     def __init__(self, sizes: Tuple[int, ...], bias=True, act=nn.Tanh):
#         super(MLP, self).__init__()
#         layers = []
#         for i in range(len(sizes) -1):
#             layers.append(nn.Linear(sizes[i], sizes[i + 1], bias=bias))
#             if i < len(sizes) - 2:
#                 layers.append(act())
#         self.model = nn.Sequential(*layers)


# class ClipCaptionModel(nn.Module):

#     #@functools.lru_cache #FIXME
#     def get_dummy_token(self, batch_size: int, device: torch.device) -> T:
#         return torch.zeros(batch_size, self.prefix_length, dtype=torch.int64, device=device)

#     def forward(self, tokens: T, prefix: T, mask: Optional[T] = None, labels: Optional[T] = None):
#         embedding_text = self.gpt.transformer.wte(tokens)
#         prefix_projections = self.clip_project(prefix).view(-1, self.prefix_length, self.gpt_embedding_size)
#         #print(embedding_text.size()) #torch.Size([5, 67, 768])
#         #print(prefix_projections.size()) #torch.Size([5, 1, 768])
#         embedding_cat = torch.cat((prefix_projections, embedding_text), dim=1)
#         if labels is not None:
#             dummy_token = self.get_dummy_token(tokens.shape[0], tokens.device)
#             labels = torch.cat((dummy_token, tokens), dim=1)
#         out = self.gpt(inputs_embeds=embedding_cat, labels=labels, attention_mask=mask)
#         return out

#     def __init__(self, prefix_length: int, prefix_size: int = 512):
#         super(ClipCaptionModel, self).__init__()
#         self.prefix_length = prefix_length
#         self.gpt = GPT2LMHeadModel.from_pretrained('gpt2')
#         self.gpt_embedding_size = self.gpt.transformer.wte.weight.shape[1]
#         if prefix_length > 10:  # not enough memory
#             self.clip_project = nn.Linear(prefix_size, self.gpt_embedding_size * prefix_length)
#         else:
#             self.clip_project = MLP((prefix_size, (self.gpt_embedding_size * prefix_length) // 2, self.gpt_embedding_size * prefix_length))


# class ClipCaptionPrefix(ClipCaptionModel):

#     def parameters(self, recurse: bool = True):
#         return self.clip_project.parameters()

#     def train(self, mode: bool = True):
#         super(ClipCaptionPrefix, self).train(mode)
#         self.gpt.eval()
#         return self

#@title Caption prediction

# def generate_beam(model, tokenizer, beam_size: int = 5, prompt=None, embed=None,
#                   entry_length=67, temperature=1., stop_token: str = '.'):

#     model.eval()
#     stop_token_index = tokenizer.encode(stop_token)[0]
#     tokens = None
#     scores = None
#     device = next(model.parameters()).device
#     seq_lengths = torch.ones(beam_size, device=device)
#     is_stopped = torch.zeros(beam_size, device=device, dtype=torch.bool)
#     with torch.no_grad():
#         if embed is not None:
#             generated = embed
#         else:
#             if tokens is None:
#                 tokens = torch.tensor(tokenizer.encode(prompt))
#                 tokens = tokens.unsqueeze(0).to(device)
#                 generated = model.gpt.transformer.wte(tokens)
#         for i in range(entry_length):
#             outputs = model.gpt(inputs_embeds=generated)
#             logits = outputs.logits
#             logits = logits[:, -1, :] / (temperature if temperature > 0 else 1.0)
#             logits = logits.softmax(-1).log()
#             if scores is None:
#                 scores, next_tokens = logits.topk(beam_size, -1)
#                 generated = generated.expand(beam_size, *generated.shape[1:])
#                 next_tokens, scores = next_tokens.permute(1, 0), scores.squeeze(0)
#                 if tokens is None:
#                     tokens = next_tokens
#                 else:
#                     tokens = tokens.expand(beam_size, *tokens.shape[1:])
#                     tokens = torch.cat((tokens, next_tokens), dim=1)
#             else:
#                 logits[is_stopped] = -float(np.inf)
#                 logits[is_stopped, 0] = 0
#                 scores_sum = scores[:, None] + logits
#                 seq_lengths[~is_stopped] += 1
#                 scores_sum_average = scores_sum / seq_lengths[:, None]
#                 scores_sum_average, next_tokens = scores_sum_average.view(-1).topk(beam_size, -1)
#                 next_tokens_source = next_tokens // scores_sum.shape[1]
#                 seq_lengths = seq_lengths[next_tokens_source]
#                 next_tokens = next_tokens % scores_sum.shape[1]
#                 next_tokens = next_tokens.unsqueeze(1)
#                 tokens = tokens[next_tokens_source]
#                 tokens = torch.cat((tokens, next_tokens), dim=1)
#                 generated = generated[next_tokens_source]
#                 scores = scores_sum_average * seq_lengths
#                 is_stopped = is_stopped[next_tokens_source]
#             next_token_embed = model.gpt.transformer.wte(next_tokens.squeeze()).view(generated.shape[0], 1, -1)
#             generated = torch.cat((generated, next_token_embed), dim=1)
#             is_stopped = is_stopped + next_tokens.eq(stop_token_index).squeeze()
#             if is_stopped.all():
#                 break
#     scores = scores / seq_lengths
#     output_list = tokens.cpu().numpy()
#     output_texts = [tokenizer.decode(output[:int(length)]) for output, length in zip(output_list, seq_lengths)]
#     order = scores.argsort(descending=True)
#     output_texts = [output_texts[i] for i in order]
#     return output_texts


# def generate2(
#         model,
#         tokenizer,
#         tokens=None,
#         prompt=None,
#         embed=None,
#         entry_count=1,
#         entry_length=67,  # maximum number of words
#         top_p=0.8,
#         temperature=1.,
#         stop_token: str = '.',
# ):
#     model.eval()
#     generated_num = 0
#     generated_list = []
#     stop_token_index = tokenizer.encode(stop_token)[0]
#     filter_value = -float("Inf")
#     device = next(model.parameters()).device

#     with torch.no_grad():

#         for entry_idx in range(entry_count):
#             if embed is not None:
#                 generated = embed
#             else:
#                 if tokens is None:
#                     tokens = torch.tensor(tokenizer.encode(prompt))
#                     tokens = tokens.unsqueeze(0).to(device)

#                 generated = model.gpt.transformer.wte(tokens)

#             for i in range(entry_length):

#                 outputs = model.gpt(inputs_embeds=generated)
#                 logits = outputs.logits
#                 logits = logits[:, -1, :] / (temperature if temperature > 0 else 1.0)
#                 sorted_logits, sorted_indices = torch.sort(logits, descending=True)
#                 cumulative_probs = torch.cumsum(nnf.softmax(sorted_logits, dim=-1), dim=-1)
#                 sorted_indices_to_remove = cumulative_probs > top_p
#                 sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[
#                                                     ..., :-1
#                                                     ].clone()
#                 sorted_indices_to_remove[..., 0] = 0

#                 indices_to_remove = sorted_indices[sorted_indices_to_remove]
#                 logits[:, indices_to_remove] = filter_value
#                 next_token = torch.argmax(logits, -1).unsqueeze(0)
#                 next_token_embed = model.gpt.transformer.wte(next_token)
#                 if tokens is None:
#                     tokens = next_token
#                 else:
#                     tokens = torch.cat((tokens, next_token), dim=1)
#                 generated = torch.cat((generated, next_token_embed), dim=1)
#                 if stop_token_index == next_token.item():
#                     break

#             output_list = list(tokens.squeeze().cpu().numpy())
#             output_text = tokenizer.decode(output_list)
#             generated_list.append(output_text)

#     return generated_list[0]

# if MODEL == "clip":

#     #@title CLIP model + GPT2 tokenizer
#     clip_device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
#     clip_model, preprocess = clip.load("ViT-B/32", device=clip_device, jit=False)
#     tokenizer = GPT2Tokenizer.from_pretrained("gpt2")

#     #@title Load model weights


#     prefix_length = 10

#     caption_model = ClipCaptionModel(prefix_length)

#     caption_model.load_state_dict(torch.load('function/clipcap.pt', map_location=torch.device('cpu'))) 

#     caption_model = caption_model.eval()
#     caption_model = caption_model.to(clip_device)

# else:


## BLIP
# from transformers import BlipProcessor, BlipForConditionalGeneration
# processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
# model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large").to("cuda")


## InstructBLIP
from transformers import InstructBlipProcessor, InstructBlipForConditionalGeneration
import torch
from PIL import Image
import requests


# model = InstructBlipForConditionalGeneration.from_pretrained("Salesforce/instructblip-flan-t5-xl")
# processor = InstructBlipProcessor.from_pretrained("Salesforce/instructblip-flan-t5-xl")

# device = "cuda:1" if torch.cuda.is_available() else "cpu"
# model.to(device)




prompt = "Describe this image in detail. Also Explain words in the image."

def extract_caption(image_path, model, processor, device):
    image = io.imread(image_path)
    pil_image = Image.fromarray(image)
    inputs = processor(images=pil_image, text=prompt, return_tensors="pt").to(device)
    outputs = model.generate(
        **inputs,
        do_sample=True,
        num_beams=10,
        max_length=200,
        min_length=20,
        top_p=0.9,
        repetition_penalty=2.0,
        length_penalty=1.0,
        temperature=0.9,
    )
    generated_text = processor.batch_decode(outputs, skip_special_tokens=True)[0].strip()
    return generated_text
    
    
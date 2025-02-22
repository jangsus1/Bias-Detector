import yake
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
from textblob import TextBlob
from collections import Counter
import spacy
import math

# Load the SpaCy English language model
nlp = spacy.load("en_core_web_sm")

# Function to remove articles from a noun phrase
def remove_articles(phrase):
    # Define articles to be removed
    articles = ["the", "a", "an"]
    # Split the phrase into words, remove articles, and rejoin
    return [word for word in phrase.split() if word.lower() not in articles]

def preprocess(text):
    # select first sentence only with first 3 words removed
    text = text.split(".")[0]
    text = " ".join(text.split(" ")[3:])
    return text

def extract_keyword(class1_texts, class2_texts, deduplication_threshold = 0.8, max_ngram_size=3, num_keywords=20):
    
    captions = " ".join(class1_texts)
    language = "en"
    custom_kw_extractor = yake.KeywordExtractor(lan=language, n=max_ngram_size, dedupLim=deduplication_threshold, top=num_keywords, features=None)
    keywords = custom_kw_extractor.extract_keywords(captions)
    keywords = [keyword[0] for keyword in keywords]
    return keywords


def compute_tf(document):
    tf_document = Counter(document.split())
    num_words_in_document = len(document.split())
    for word in tf_document:
        tf_document[word] = tf_document[word] / num_words_in_document
    return tf_document

# Step 2: Calculate Inverse Document Frequency (IDF)
def compute_idf(word, corpus):
    num_documents_with_word = sum(1 for document in corpus if word in document.split())
    return math.log(len(corpus) / (1 + num_documents_with_word))

# Step 3: Calculate TF-IDF
def compute_tfidf(corpus):
    documents_tf = [compute_tf(document) for document in corpus]
    unique_words = set(word for document in corpus for word in document.split())
    idfs = {word: compute_idf(word, corpus) for word in unique_words}
    
    tfidf_scores = []
    for document_tf in documents_tf:
        tfidf_document = {}
        for word, tf in document_tf.items():
            tfidf_document[word] = tf * idfs[word]
        tfidf_scores.append(tfidf_document)
    
    return tfidf_scores

def extract_keyword_tf_idf(class1_texts, class2_texts, max_ngram_size=2, top_n=20):
    class1_texts = [preprocess(text) for text in class1_texts]
    class2_texts = [preprocess(text) for text in class2_texts]
    
    return tf_idf(class1_texts, class2_texts, max_ngram_size, top_n)


def extract_nouns(text):
    chunks = nlp(text).noun_chunks
    chunks = [remove_articles(np.text) for np in chunks]
    return_list = []
    for c in chunks:
        # if len(c) > 1:
        #     return_list.append(c[-1])
        return_list.append(' '.join(c))
    return return_list

def extract_keyword_common(class1_texts, class2_texts, max_ngram_size=1, top_n=20):
    class1_texts = [preprocess(text) for text in class1_texts]
    class2_texts = [preprocess(text) for text in class2_texts]
    # class1_keywords = [list(set(TextBlob(text).noun_phrases)) for text in class1_texts]
    # class2_keywords = [list(set(TextBlob(text).noun_phrases)) for text in class2_texts]
    
    class1_nouns = [extract_nouns(doc) for doc in class1_texts]
    class2_nouns = [extract_nouns(doc) for doc in class2_texts]
    
    
    class1_keywords = [" ".join([k.replace(" ", "_") for k in doc]) for doc in class1_nouns]
    class2_keywords = [" ".join([k.replace(" ", "_") for k in doc]) for doc in class2_nouns]
    
    # extracted_keywords = tf_idf(class1_keywords, class2_keywords, 1, top_n)
    extracted_keywords = extract_keyword(class1_keywords, class2_keywords, 0.9, 1, top_n)
    
    return [k.replace("_", " ") for k in extracted_keywords]

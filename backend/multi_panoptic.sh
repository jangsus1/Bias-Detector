nohup python3 -u panoptic.py --device cuda:0 &> split0.out &
nohup python3 -u panoptic.py --device cuda:1 &> split1.out &
nohup python3 -u panoptic.py --device cuda:2 &> split2.out &
nohup python3 -u panoptic.py --device cuda:3 &> split3.out &
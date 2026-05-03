import json
import os
import random
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PREDICTIONS_FILE = BASE_DIR / 'app' / 'data' / 'predictions.json'


def load_predictions():
    with open(PREDICTIONS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def handler(request):
    predictions = load_predictions()
    category = None
    if request and hasattr(request, 'args'):
        category = request.args.get('category')

    pool = predictions
    if category:
        lowered = category.lower().strip()
        tagged = [p for p in predictions if lowered in p.lower()]
        if tagged:
            pool = tagged

    item = random.choice(pool)
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'prediction': item, 'total': len(predictions)}, ensure_ascii=False)
    }

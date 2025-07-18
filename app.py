from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
from io import BytesIO
import tempfile
from google import genai

app = Flask(__name__)
api_key= "AIzaSyAblQfAVJGBuS_PirgDrfRSf4hRH1ZWsbo"

def analyze_hate_speech(text):
    try:
        client = genai.Client(api_key=api_key)

        prompt = f"""
        Analyze the following text for hate speech. Determine if the text contains hate speech targeting any protected group, such as those based on race, ethnicity, religion, gender, sexual orientation, disability, or other characteristics and conclude with a clear 'Yes' or 'No' indicating whether the text contains hate speech,if hate speech write "Provided text is a Hate Speech",else "Not a Hate Speech".

        Text: "{text}"
        """
        response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        )
        return response.text

    except Exception as e:
        print(f"Error in Gemini API call: {e}")
        return None
@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze text for hate speech."""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400

        text = data.get('text', '').strip()
        if not text:
            return jsonify({'error': 'Text cannot be empty'}), 400

        analysis = analyze_hate_speech(text)
        if analysis is None:
            return jsonify({'error': 'Failed to analyze text'}), 500

        verdict = "Unknown"
        if "yes" in analysis.lower():
            verdict = "Yes"
        elif "no" in analysis.lower():
            verdict = "No"

        return jsonify({'analysis': analysis, 'verdict': verdict})
    except Exception as e:
        print(f"Error in /analyze: {e}")
        return jsonify({'error': 'Internal server error'}), 500
if __name__ == '__main__':
    app.run(debug=True, port=5000)
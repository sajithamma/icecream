ICE CREAM

## Edit server/.env file to set the following variables
```bash
DEFAULT_LLM=OPENAI
GEMINI_API_KEY=key
OPENAI_API_KEY=key
```

## To run the application
```bash
python app.py
```


## To Test from the command line
```bash
curl -X POST http://localhost:7001/upload-image \
     -F "image=@/Users/sajithmr/Downloads/tshaped.png"
```


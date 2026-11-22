import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))

    url = f"http://127.0.0.1:{port}"
    print(f"\nSite aberto em:\n{url}\n")

    uvicorn.run(
        "server.app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
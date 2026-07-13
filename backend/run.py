from backend import create_app
import argparse


def main():
    parser = argparse.ArgumentParser(description="Run the backend dev server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host/IP to bind to")
    parser.add_argument("--port", type=int, default=5001, help="Port to listen on")
    parser.add_argument("--debug", action="store_true", help="Run with debug output")
    args = parser.parse_args()

    app = create_app()
    # When launching from scripts we disable the reloader to avoid
    # duplicate processes and confusing rapid restarts during file
    # modifications. Use the --debug flag to enable debug logging only.
    app.run(host=args.host, port=args.port, debug=args.debug, use_reloader=False)


if __name__ == "__main__":
    main()

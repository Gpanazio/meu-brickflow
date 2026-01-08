# Meu Brickflow

A Brickflow project configured for deployment on Railway.

## Overview

This project is set up to run on [Railway](https://railway.app/), a modern deployment platform that simplifies infrastructure management.

## Prerequisites

- Python 3.8 or higher
- A Railway account
- Git for version control

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Gpanazio/meu-brickflow.git
cd meu-brickflow
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Railway Deployment

### Setup Instructions

1. **Create a Railway Project**
   - Go to [railway.app](https://railway.app/)
   - Click "New Project" and select "Deploy from GitHub"
   - Authorize Railway to access your GitHub repositories
   - Select the `Gpanazio/meu-brickflow` repository

2. **Configure Environment Variables**
   - In your Railway project dashboard, navigate to "Variables"
   - Add any required environment variables for your Brickflow application
   - Common variables might include:
     - `BRICKFLOW_ENV`: Production/Development environment
     - `LOG_LEVEL`: Logging level configuration
     - Database or API credentials as needed

3. **Deploy**
   - Railway automatically deploys when you push changes to your main branch
   - Monitor deployment progress in the Railway dashboard
   - View logs in the "Logs" tab

### Environment Configuration

Create a `.railwayrc` file in the project root if you need custom Railway configuration:

```json
{
  "railwayIgnorePatterns": ["node_modules", ".git", "__pycache__", "*.pyc"]
}
```

## Running Locally

To test your application before deploying:

```bash
python -m brickflow run
```

## Project Structure

```
meu-brickflow/
├── README.md
├── requirements.txt
├── Dockerfile
├── railway.toml (optional)
└── src/
    └── brickflow/
        └── workflows/
```

## Monitoring and Logs

Once deployed on Railway:
- View real-time logs in the Railway dashboard
- Set up alerts for deployment failures
- Monitor resource usage (CPU, memory, bandwidth)

## Troubleshooting

### Deployment Issues
- Check the deployment logs in Railway dashboard for error messages
- Verify all environment variables are properly configured
- Ensure `requirements.txt` includes all necessary dependencies

### Runtime Issues
- Review the application logs in Railway
- Check that your Brickflow workflows are properly defined
- Verify database connections if applicable

## Support

For Railway-specific issues, refer to [Railway Documentation](https://docs.railway.app/).

For Brickflow questions, visit the [Brickflow Documentation](https://brickflow.readthedocs.io/).

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Last Updated

Generated: 2026-01-08 11:16:11 UTC

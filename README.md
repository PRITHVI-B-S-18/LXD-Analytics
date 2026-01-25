# LXD Analytics

A comprehensive training and operations analytics dashboard built with React and FastAPI.

## Features

- **Training Hub**: Track training programs, trainers, and utilization metrics
- **Dashboard**: Overview of key performance indicators
- **Utilization Analytics**: By Program, Client, Date, and Trainer
- **Data Explorer**: Browse raw and transformed data with server-side pagination
- **SharePoint Integration**: Real-time sync with Excel Online/SharePoint

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- TanStack Table for data tables
- React Router for navigation

### Backend
- FastAPI (Python)
- Pandas for data processing
- Microsoft Graph API for SharePoint integration

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
├── backend/
│   ├── api/              # API routes and models
│   ├── services/         # Business logic (data loading, transformation)
│   └── main.py           # FastAPI application entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Shared UI components
│   │   ├── hubs/         # Hub-specific code (Training, Delivery, Ops)
│   │   ├── pages/        # Root-level pages (Hub Selector)
│   │   ├── services/     # API client
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Utility functions
│   └── ...
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
SHAREPOINT_SITE_URL=your_sharepoint_url
SHAREPOINT_FILE_NAME=your_file_name.xlsx
```

## Deployment on Render

### Option 1: Blueprint (Recommended)
1. Fork/push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Blueprint"
4. Connect your GitHub repo
5. Render will auto-detect `render.yaml` and create both services

### Option 2: Manual Deployment

#### Backend (Web Service)
1. Create a new "Web Service" on Render
2. Connect your GitHub repo
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables for SharePoint integration

#### Frontend (Static Site)
1. Create a new "Static Site" on Render
2. Connect your GitHub repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL`: Your backend URL (e.g., `https://lxd-analytics-api.onrender.com`)
5. Add rewrite rule: `/*` → `/index.html`

### Environment Variables (Backend)
| Variable | Description |
|----------|-------------|
| `AZURE_TENANT_ID` | Azure AD Tenant ID |
| `AZURE_CLIENT_ID` | Azure App Client ID |
| `AZURE_CLIENT_SECRET` | Azure App Client Secret |
| `SHAREPOINT_SITE_URL` | SharePoint site URL |
| `SHAREPOINT_FILE_NAME` | Excel file name |

## License

Private - Training Delivery Ops

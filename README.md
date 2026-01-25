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

## License

Private - Training Delivery Ops

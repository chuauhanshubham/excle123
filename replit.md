# Excel Summary Generator

## Overview

This is a full-stack web application for processing financial data from Excel files. The application allows users to upload deposit and withdrawal Excel files, apply custom percentage calculations to merchant data, and generate summary reports. The system is built with a React frontend, Express.js backend, and uses PostgreSQL with Drizzle ORM for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for HTTP server and API routes
- **File Processing**: Multer for file uploads, XLSX for Excel file parsing
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)

### Data Storage Strategy
- **Primary Storage**: PostgreSQL database with two main tables:
  - `uploaded_files`: Stores file metadata, merchant data, and processed Excel content
  - `reports`: Stores generated summary reports with merchant percentages and calculations
- **File Storage**: Local filesystem for temporary Excel file storage during processing
- **In-Memory Cache**: Memory-based storage implementation as fallback when database is unavailable

## Key Components

### Data Processing Pipeline
1. **File Upload**: Excel files are uploaded via multipart form data
2. **Data Extraction**: XLSX library parses Excel content and extracts merchant transaction data
3. **Date Processing**: Custom date extraction handles both Excel date formats and string dates
4. **Merchant Identification**: Automatic extraction of unique merchant names from transaction data
5. **Percentage Calculation**: User-defined percentages applied to merchant totals
6. **Report Generation**: Summary calculations with totals, fees, and net amounts

### API Endpoints
- `POST /api/upload?type={Deposit|Withdrawal}`: Upload and process Excel files
- `POST /api/generate?type={Deposit|Withdrawal}`: Generate summary reports with custom percentages
- `GET /api/reports`: Retrieve all generated reports
- `GET /output/*`: Serve generated Excel summary files

### Frontend Components
- **SummaryPanel**: Main component for file upload and report generation per panel type
- **Combined Summary**: Aggregated view of all processed data across both panels
- **Data Tables**: Display processed merchant data with sorting and filtering

## Data Flow

1. **File Upload Flow**:
   - User selects Excel file and panel type (Deposit/Withdrawal)
   - Frontend sends multipart form data to upload endpoint
   - Backend processes file, extracts merchant data, stores in database
   - Response includes merchant list for percentage configuration

2. **Report Generation Flow**:
   - User configures percentage values for each merchant
   - Frontend sends generation request with date range and percentages
   - Backend filters data by date range, applies calculations
   - Generated Excel report saved to output directory
   - Summary data stored in database and returned to frontend

3. **Data Persistence Flow**:
   - All uploaded file metadata and processed data stored in PostgreSQL
   - Generated reports with calculations stored for historical access
   - Fallback to in-memory storage when database unavailable

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL client for Neon Database
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **multer**: Multipart file upload middleware
- **xlsx**: Excel file parsing and generation
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React router

### UI Dependencies
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant API for components
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool with hot module replacement
- **typescript**: Type safety across frontend and backend
- **@replit/vite-plugin-***: Replit-specific development plugins

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React application to `dist/public`
- **Backend**: ESBuild bundles Express server to `dist/index.js`
- **Database**: Drizzle migrations handle schema changes

### Production Environment
- **Server**: Single Node.js process serving both API and static files
- **Database**: PostgreSQL connection via DATABASE_URL environment variable
- **File Storage**: Local filesystem with `/output` endpoint for file serving
- **Process Management**: Direct Node.js execution of bundled server

### Development Environment
- **Hot Reload**: Vite dev server with middleware mode for seamless development
- **Type Checking**: TypeScript compilation without emit for fast feedback
- **Database**: Local or cloud PostgreSQL instance for development

## Changelog
- July 01, 2025. Initial setup
- July 01, 2025. Enhanced Recent Summary Results to show ALL merchants from uploaded files
- July 01, 2025. Added Excel export functionality with XLSX library for Recent Summary Results
- July 01, 2025. Increased file upload limits to 500MB to support large Excel files without errors
- July 01, 2025. Fixed percentage display issues and currency formatting to show Indian Rupees (₹)

## User Preferences

Preferred communication style: Simple, everyday language.
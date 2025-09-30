import { Router } from 'express';
import { apiReference } from '@scalar/express-api-reference';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Read the OpenAPI specification
const openApiPath = path.join(__dirname, '../../docs/api/openapi.yaml');
const openApiSpec = fs.readFileSync(openApiPath, 'utf-8');

// Mount Scalar API documentation at /api/docs
router.use(
  '/',
  apiReference({
    spec: {
      content: openApiSpec,
    },
    theme: 'purple',
    layout: 'modern',
    darkMode: true,
    showSidebar: true,
    hideModels: false,
    hideDownloadButton: false,
    customCss: `
      .scalar-api-client {
        --scalar-color-1: #9333ea;
        --scalar-color-2: #7c3aed;
        --scalar-color-3: #6d28d9;
      }
    `,
  })
);

export default router;
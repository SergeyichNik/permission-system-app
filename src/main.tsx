import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      roles={['admin']}
      operationIds={['OP_EXPORT', 'OP_ORDERS']}
      featureFlags={{ experimental_options: true, extended_priority: false }}
    />
  </StrictMode>,
)

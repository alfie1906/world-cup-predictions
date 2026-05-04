import React from 'react'

const ErrorBanner: React.FC<{ message?: string | null }> = ({ message }) => {
  if (!message) return null
  return (
    <div className="error-banner">
      <strong>Import error:</strong> {message}
    </div>
  )
}

export default ErrorBanner

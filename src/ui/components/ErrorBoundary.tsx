/**
 * Error Boundary Component
 * Catches React errors and displays System Rejection screen
 */
import React, { Component, ReactNode } from 'react';
import { SystemRejectionScreen } from '../screens/SystemRejectionScreen';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error Boundary caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return <SystemRejectionScreen error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

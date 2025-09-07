"use client";

import dynamic from 'next/dynamic';
import React from 'react';

const LoadingBox = () => (
  <div className="w-full rounded bg-muted/40 h-40 animate-pulse" aria-busy="true" aria-label="Loading" />
);

const Inner = dynamic(() => import('../CodeRunnerClient'), {
  ssr: false,
  loading: () => <LoadingBox />,
});

export default Inner;

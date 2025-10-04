import React from 'react';

export interface LazyComponent<T = any> extends React.LazyExoticComponent<T> {
  preload?: () => Promise<void>;
}

export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyComponent<T> {
  const Component = React.lazy(factory) as LazyComponent<T>;
  Component.preload = () => factory().then(() => {});
  return Component;
}
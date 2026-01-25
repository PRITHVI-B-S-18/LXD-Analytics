import { Outlet } from 'react-router-dom';

export default function Utilization() {
  return <Outlet />;
}

export { default as ByProgram } from './ByProgram';
export { default as ByClient } from './ByClient';
export { default as ByDate } from './ByDate';
export { default as ByTrainer } from './ByTrainer';

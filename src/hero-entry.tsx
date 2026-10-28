import React from 'react';
import { createRoot } from 'react-dom/client';
import FizoraHero from './FizoraHero';

const mount = document.getElementById('fizora-hero-root');
if (mount) createRoot(mount).render(<FizoraHero />);

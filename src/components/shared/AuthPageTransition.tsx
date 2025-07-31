import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthPageTransitionProps {
  children: React.ReactNode;
}

const variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.3, ease: 'easeIn' } },
};

const AuthPageTransition: React.FC<AuthPageTransitionProps> = ({ children }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={typeof window !== 'undefined' ? window.location.pathname : 'auth'}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

export default AuthPageTransition; 
/* Shared app context — extracted so pages can consume it without importing the
   root App component (which would create an import cycle). */
import { createContext, useContext } from 'react';

export const InklyContext = createContext(null);

export function useInkly() {
  return useContext(InklyContext);
}
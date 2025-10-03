// SearchContext.tsx
import React, {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';

// Feel free to expand this type if you want to add global search filters, etc.
type SearchContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [searchQuery, setSearchQueryState] = useState('');

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQueryState('');
  }, []);

  // useMemo to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      clearSearch,
    }),
    [searchQuery, setSearchQuery, clearSearch]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

// Typed hook
export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within a SearchProvider');
  return ctx;
};

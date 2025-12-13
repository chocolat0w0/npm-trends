import { useEffect, useState } from 'react';
import { normalizePackageName } from '../services/npmClient';
import { usePackagesStore } from '../store/packagesStore';

const PACKAGES_QUERY_KEY = 'packages';

const isBrowser = typeof window !== 'undefined';

const parsePackagesFromSearch = (search: string): string[] => {
  if (!search || !isBrowser) {
    return [];
  }
  const params = new URLSearchParams(search);
  const value = params.get(PACKAGES_QUERY_KEY);
  if (!value) {
    return [];
  }
  const seen = new Set<string>();
  const packages: string[] = [];

  value.split(',').forEach((entry) => {
    const packageName = normalizePackageName(entry);
    if (!packageName || seen.has(packageName)) {
      return;
    }
    seen.add(packageName);
    packages.push(packageName);
  });

  return packages;
};

const serializePackages = (packages: string[]): string =>
  packages.map((packageName) => encodeURIComponent(packageName)).join(',');

const buildSearchWithPackages = (search: string, packages: string[]): string => {
  if (!isBrowser) {
    return '';
  }
  const params = new URLSearchParams(search);
  params.delete(PACKAGES_QUERY_KEY);

  const serializedPackages = serializePackages(packages);

  const segments: string[] = [];
  params.forEach((value, key) => {
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    segments.push(`${encodedKey}=${encodedValue}`);
  });

  if (serializedPackages) {
    segments.push(`${encodeURIComponent(PACKAGES_QUERY_KEY)}=${serializedPackages}`);
  }

  return segments.join('&');
};

export const usePackageQuerySync = (): void => {
  const packages = usePackagesStore((state) => state.packages);
  const initializeFromQuery = usePackagesStore((state) => state.initializeFromQuery);
  const [hasHydratedQuery, setHasHydratedQuery] = useState(() => !isBrowser);

  useEffect(() => {
    if (!isBrowser || hasHydratedQuery) {
      return;
    }

    let isActive = true;
    const queryPackages = parsePackagesFromSearch(window.location.search);
    if (queryPackages.length === 0) {
      setHasHydratedQuery(true);
      return;
    }

    void initializeFromQuery(queryPackages)
      .catch(() => undefined)
      .finally(() => {
        if (isActive) {
          setHasHydratedQuery(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [initializeFromQuery, hasHydratedQuery]);

  useEffect(() => {
    if (!isBrowser || !hasHydratedQuery) {
      return;
    }

    const nextSearch = buildSearchWithPackages(window.location.search, packages);
    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ''
    }${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl === currentUrl) {
      return;
    }

    window.history.replaceState(window.history.state, '', nextUrl);
  }, [packages, hasHydratedQuery]);
};

export default usePackageQuerySync;

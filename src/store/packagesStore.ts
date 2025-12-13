import { useCallback, useRef, useSyncExternalStore } from 'react';
import { DownloadSeries } from '../types/DownloadSeries';
import { PackageRequestStatus, PackageSummary } from '../types/Packages';
import { fetchPackageDownloads, normalizePackageName } from '../services/npmClient';

type FetchDownloads = (packageName: string) => Promise<DownloadSeries>;

type SetState<TState> = (
  partial:
    | Partial<TState>
    | TState
    | ((state: TState) => Partial<TState> | TState),
  replace?: boolean,
) => TState;

type GetState<TState> = () => TState;

type StoreListener<TState> = (state: TState, previousState: TState) => void;

export interface StoreApi<TState> {
  getState: GetState<TState>;
  setState: SetState<TState>;
  subscribe: (listener: StoreListener<TState>) => () => void;
}

const createStore = <TState extends Record<string, unknown>>(
  initializer: (set: SetState<TState>, get: GetState<TState>) => TState,
): StoreApi<TState> => {
  let state: TState;
  const listeners = new Set<StoreListener<TState>>();

  const getState: GetState<TState> = () => state;

  const setState: SetState<TState> = (partial, replace) => {
    const nextStateValue =
      typeof partial === 'function'
        ? (partial as (current: TState) => Partial<TState> | TState)(state)
        : partial;

    if (nextStateValue == null) {
      return state;
    }

    const nextState = replace
      ? (nextStateValue as TState)
      : Object.assign({}, state, nextStateValue);

    if (Object.is(nextState, state)) {
      return state;
    }

    const previousState = state;
    state = nextState;
    listeners.forEach((listener) => listener(state, previousState));
    return state;
  };

  const subscribe = (listener: StoreListener<TState>) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = initializer(setState, getState);
  return { getState, setState, subscribe };
};

type UseStoreSelector<State, Slice> = (state: State) => Slice;

type EqualityChecker<Slice> = (previous: Slice, next: Slice) => boolean;

type UseStoreHook<State> = {
  (): State;
  <Slice>(selector: UseStoreSelector<State, Slice>): Slice;
  <Slice>(
    selector: UseStoreSelector<State, Slice>,
    equalityFn: EqualityChecker<Slice>,
  ): Slice;
} & StoreApi<State>;

const createBoundHook = <State extends object>(
  api: StoreApi<State>,
): UseStoreHook<State> => {
  const useStore = <Slice = State>(
    selector: UseStoreSelector<State, Slice> = ((state) => state as Slice),
    equalityFn: EqualityChecker<Slice> = Object.is,
  ): Slice => {
    const selectorRef = useRef(selector);
    const equalityFnRef = useRef(equalityFn);
    const lastStateRef = useRef<State>();
    const sliceRef = useRef<Slice>(selector(api.getState()));

    if (selectorRef.current !== selector) {
      selectorRef.current = selector;
      lastStateRef.current = undefined;
      sliceRef.current = selector(api.getState());
    }

    if (equalityFnRef.current !== equalityFn) {
      equalityFnRef.current = equalityFn;
    }

    const getSnapshot = useCallback(() => {
      const nextState = api.getState();
      if (lastStateRef.current !== nextState) {
        lastStateRef.current = nextState;
        sliceRef.current = selectorRef.current(nextState);
      }
      return sliceRef.current;
    }, [api]);

    const subscribe = useCallback(
      (notify: () => void) =>
        api.subscribe((state, previous) => {
          const previousSlice =
            lastStateRef.current === previous && sliceRef.current !== undefined
              ? sliceRef.current
              : selectorRef.current(previous);
          const nextSlice = selectorRef.current(state);
          if (!equalityFnRef.current(previousSlice, nextSlice)) {
            lastStateRef.current = state;
            sliceRef.current = nextSlice;
            notify();
            return;
          }
          lastStateRef.current = state;
          sliceRef.current = nextSlice;
        }),
      [api],
    );

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  };

  return Object.assign(useStore, api);
};

const dedupeNormalizedPackages = (values: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  values.forEach((value) => {
    const packageName = normalizePackageName(value);
    if (!packageName || seen.has(packageName)) {
      return;
    }
    seen.add(packageName);
    normalized.push(packageName);
  });

  return normalized;
};

const omitKey = <TValue>(map: Record<string, TValue>, key: string) => {
  const clone = { ...map };
  delete clone[key];
  return clone;
};

const createEmptySeries = (packageName: string): DownloadSeries => ({
  packageName,
  start: '',
  end: '',
  points: [],
  totalDownloads: 0,
  lastDayDownloads: 0,
});

export interface PackagesStoreState {
  packages: string[];
  datasets: Record<string, DownloadSeries>;
  status: Record<string, PackageRequestStatus>;
  errors: Record<string, string | undefined>;
}

export interface PackagesStoreActions {
  addPackage: (packageName: string) => Promise<void>;
  removePackage: (packageName: string) => void;
  initializeFromQuery: (packages: string[]) => Promise<void>;
  refreshPackage: (packageName: string) => Promise<void>;
  clearError: (packageName: string) => void;
}

export type PackagesStore = PackagesStoreState & PackagesStoreActions;

export interface PackagesStoreOptions {
  fetchDownloads?: FetchDownloads;
}

const formatErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Failed to load package downloads';

export const createPackagesStore = (
  options: PackagesStoreOptions = {},
): StoreApi<PackagesStore> => {
  const fetchDownloads = options.fetchDownloads ?? fetchPackageDownloads;
  const pendingRequests = new Map<string, Promise<void>>();

  return createStore<PackagesStore>((set, get) => {
    const runPackageFetch = (packageName: string) => {
      const existingRequest = pendingRequests.get(packageName);
      if (existingRequest) {
        return existingRequest;
      }

      const request = (async () => {
        set((state) => ({
          status: { ...state.status, [packageName]: 'loading' },
          errors: omitKey(state.errors, packageName),
        }));

        try {
          const series = await fetchDownloads(packageName);
          if (!get().packages.includes(packageName)) {
            return;
          }
          set((state) => ({
            datasets: { ...state.datasets, [packageName]: series },
            status: { ...state.status, [packageName]: 'success' },
          }));
        } catch (error) {
          if (!get().packages.includes(packageName)) {
            return;
          }
          set((state) => ({
            status: { ...state.status, [packageName]: 'error' },
            errors: { ...state.errors, [packageName]: formatErrorMessage(error) },
          }));
        } finally {
          pendingRequests.delete(packageName);
        }
      })();

      pendingRequests.set(packageName, request);
      return request;
    };

    return {
      packages: [],
      datasets: {},
      status: {},
      errors: {},
      addPackage: async (value: string) => {
        const packageName = normalizePackageName(value);
        if (!packageName) {
          return;
        }
        if (get().packages.includes(packageName)) {
          return;
        }
        set((state) => ({
          packages: [...state.packages, packageName],
          status: { ...state.status, [packageName]: 'idle' },
        }));
        await runPackageFetch(packageName);
      },
      removePackage: (value: string) => {
        const packageName = normalizePackageName(value);
        if (!packageName) {
          return;
        }
        set((state) => {
          if (!state.packages.includes(packageName)) {
            return state;
          }
          return {
            packages: state.packages.filter((name) => name !== packageName),
            datasets: omitKey(state.datasets, packageName),
            status: omitKey(state.status, packageName),
            errors: omitKey(state.errors, packageName),
          };
        });
      },
      initializeFromQuery: async (rawPackages: string[]) => {
        const packages = dedupeNormalizedPackages(rawPackages);
        set((state) => {
          const datasets = packages.reduce<Record<string, DownloadSeries>>(
            (acc, packageName) => {
              const series = state.datasets[packageName];
              if (series) {
                acc[packageName] = series;
              }
              return acc;
            },
            {},
          );
          const status = packages.reduce<Record<string, PackageRequestStatus>>(
            (acc, packageName) => {
              acc[packageName] = state.status[packageName] ?? 'idle';
              return acc;
            },
            {},
          );
          const errors = packages.reduce<Record<string, string | undefined>>(
            (acc, packageName) => {
              if (state.errors[packageName]) {
                acc[packageName] = state.errors[packageName];
              }
              return acc;
            },
            {},
          );
          return { packages, datasets, status, errors };
        });

        const state = get();
        const toFetch = packages.filter(
          (packageName) => !state.datasets[packageName],
        );
        await Promise.all(toFetch.map((packageName) => runPackageFetch(packageName)));
      },
      refreshPackage: async (value: string) => {
        const packageName = normalizePackageName(value);
        if (!packageName || !get().packages.includes(packageName)) {
          return;
        }
        await runPackageFetch(packageName);
      },
      clearError: (value: string) => {
        const packageName = normalizePackageName(value);
        if (!packageName) {
          return;
        }
        set((state) => {
          if (!(packageName in state.errors)) {
            return state;
          }
          return {
            errors: omitKey(state.errors, packageName),
          };
        });
      },
    };
  });
};

export const packagesStore = createPackagesStore();

export const usePackagesStore = createBoundHook(packagesStore);

export const selectOrderedSeries = (state: PackagesStore): DownloadSeries[] =>
  state.packages
    .map((packageName) => state.datasets[packageName])
    .filter((series): series is DownloadSeries => Boolean(series));

export const selectPackageSummaries = (state: PackagesStore): PackageSummary[] =>
  state.packages.map((packageName) => {
    const series = state.datasets[packageName] ?? createEmptySeries(packageName);
    return {
      ...series,
      status: state.status[packageName] ?? 'idle',
      error: state.errors[packageName],
    } satisfies PackageSummary;
  });

export const selectIsAnyLoading = (state: PackagesStore) =>
  state.packages.some((packageName) => state.status[packageName] === 'loading');

export const selectHasErrors = (state: PackagesStore) =>
  state.packages.some((packageName) => Boolean(state.errors[packageName]));

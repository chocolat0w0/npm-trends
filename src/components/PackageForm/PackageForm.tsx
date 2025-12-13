import { FormEvent, useMemo, useState } from 'react';
import { usePackagesStore } from '../../store/packagesStore';
import { normalizePackageName } from '../../services/npmClient';
import './PackageForm.css';

const numberFormatter = new Intl.NumberFormat('en-US');

const PLACEHOLDER_EXAMPLES = ['react', 'next', 'tailwindcss'];

const PackageForm = () => {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const packages = usePackagesStore((state) => state.packages);
  const status = usePackagesStore((state) => state.status);
  const addPackage = usePackagesStore((state) => state.addPackage);

  const packageCount = packages.length;
  const examplePackage = PLACEHOLDER_EXAMPLES[
    packageCount % PLACEHOLDER_EXAMPLES.length
  ];

  const normalizedValue = normalizePackageName(value);
  const isDuplicate = normalizedValue ? packages.includes(normalizedValue) : false;
  const isEmpty = normalizedValue.length === 0;
  const isBusy =
    isSubmitting || packages.some((packageName) => status[packageName] === 'loading');

  const helperText = useMemo(() => {
    if (touched && isEmpty) {
      return 'Enter a package name to continue.';
    }
    if (isDuplicate) {
      return `${normalizedValue} is already in the list.`;
    }
    if (packageCount > 0) {
      return `Tracking ${numberFormatter.format(packageCount)} package${
        packageCount > 1 ? 's' : ''
      } right now.`;
    }
    return `Try something like ${examplePackage}.`;
  }, [touched, isEmpty, isDuplicate, normalizedValue, packageCount, examplePackage]);

  const hasError = (touched && isEmpty) || isDuplicate;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (isEmpty || isDuplicate || isBusy) {
      return;
    }
    const nextValue = normalizedValue;
    setIsSubmitting(true);
    setValue('');
    setTouched(false);
    try {
      await addPackage(nextValue);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="package-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      noValidate
    >
      <label htmlFor="package-input" className="package-form-label">
        Package name
      </label>

      <div className="package-form-control">
        <input
          id="package-input"
          name="package"
          type="text"
          placeholder={`e.g. ${examplePackage}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
          className="package-input"
          aria-invalid={hasError}
          aria-describedby="package-helper"
          autoComplete="off"
        />
        <button
          type="submit"
          className="package-submit"
          disabled={isBusy || isEmpty || isDuplicate}
        >
          {isSubmitting ? 'Adding…' : 'Add package'}
        </button>
      </div>

      <p
        id="package-helper"
        className={hasError ? 'package-helper error' : 'package-helper'}
        role="status"
        aria-live="polite"
      >
        {helperText}
      </p>
    </form>
  );
};

export default PackageForm;

import inputClassName from '@/utils/inputClassName';
import inputFormClassName from '@/utils/inputFormClassName';
import { useState, useEffect } from 'react';
import validator from 'validator';

const DEBOUNCE_DELAY = 500; // Adjust the delay as needed

interface EditUrlProps {
  data: string;
  setData: any;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
}

export default function EditURL({
  data,
  setData,
  placeholder,
  title,
  required = false,
  disabled = false,
}: EditUrlProps) {
  const [inputValue, setInputValue] = useState<string>(data || '');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    setInputValue(data || '');
  }, [data]); // Update inputValue when 'data' changes

  const validate = (value: string) => {
    // Un campo vacío es válido (el enlace es opcional)
    if (value.trim() === '' || validator.isURL(value)) {
      setErrorMessage('');
      // setData(value); // Only update parent state with valid URLs
    } else {
      setErrorMessage('Introduce una URL válida, por ejemplo https://ejemplo.com');
    }
    setData(value);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validate(inputValue || '');
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [inputValue]);

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value); // Update inputValue instead of data
  };

  return (
    <div className="w-full">
      <span className="dark:text-dark-txt mb-1 block text-sm font-medium text-gray-900">{title}</span>
      <div className={`${inputFormClassName}`}>
        <input
          type="url"
          value={inputValue}
          required={required}
          onChange={handleUrlInputChange}
          className={`${inputClassName}`}
          disabled={disabled}
          placeholder={placeholder}
          aria-describedby="url-input"
        />
      </div>
      {errorMessage && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errorMessage}</p>}
    </div>
  );
}

EditURL.defaultProps = {
  required: false,
  disabled: false,
  placeholder: '',
  title: '',
};

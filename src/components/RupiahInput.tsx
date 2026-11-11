import React, { useState, useEffect } from 'react';

export const formatRupiah = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
};

export const parseRupiah = (valStr: string | number | undefined | null): number => {
  if (typeof valStr === 'number') return isNaN(valStr) ? 0 : valStr;
  if (!valStr) return 0;
  const digits = String(valStr).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

interface RupiahInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChangeValue: (val: number) => void;
  prefix?: string;
  containerClassName?: string;
}

export const RupiahInput: React.FC<RupiahInputProps> = ({
  value,
  onChangeValue,
  prefix = 'Rp',
  containerClassName = 'relative flex items-center w-full',
  className = '',
  placeholder = '0',
  disabled = false,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState<string>(formatRupiah(value));

  useEffect(() => {
    setDisplayValue(formatRupiah(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const num = parseRupiah(rawVal);
    setDisplayValue(formatRupiah(num));
    onChangeValue(num);
  };

  return (
    <div className={containerClassName}>
      {prefix && (
        <span className="absolute left-3 font-bold text-slate-500 text-xs pointer-events-none select-none z-10">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${prefix ? 'pl-8' : 'pl-3'} ${className}`}
        {...props}
      />
    </div>
  );
};

type ButtonProps = {
  children: React.ReactNode;
  textColor?: string;
  bgColor?: string;
  padding?: string;
  margin?: string;
  textSize?: string;
  type?: string;
  icon?: string;
  hoverEffect?: boolean;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  textColor = 'text-white dark:text-white',
  type = 'button',
  icon = '',
  textSize = 'text-sm',
  bgColor = 'bg-indigo-600 hover:bg-indigo-500',
  padding = 'py-2.5 px-4',
  margin = '',
  hoverEffect = false,
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      disabled={disabled}
      className={`group inline-flex h-11 w-full items-center justify-center gap-x-2 rounded-lg transition-colors ${textColor} ${textSize} ${padding} ${bgColor} ${margin} ${
        hoverEffect && !disabled ? 'shadow-sm hover:shadow-md' : ''
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${props.className || ''}`}
    >
      {icon !== '' && <div className={`${icon}`} aria-hidden="true" />}
      <span
        className={`flex-1 text-center font-semibold ${
          textColor
        }`}
      >
        {children}
      </span>
    </button>
  );
}

Button.defaultProps = {
  textColor: 'text-white dark:text-white',
  bgColor: 'bg-indigo-700 hover:bg-indigo-700',
  padding: 'py-3.5 px-4',
  margin: '',
  textSize: 'text-md',
  type: 'button',
  icon: '',
  hoverEffect: false,
  disabled: false,
};

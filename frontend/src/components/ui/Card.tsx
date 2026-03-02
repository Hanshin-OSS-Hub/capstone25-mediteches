interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm border border-gray-100 p-6
        ${hoverable ? 'hover:shadow-md hover:border-emerald-200 transition-all duration-200 cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

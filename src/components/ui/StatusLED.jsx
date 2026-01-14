import { COLOR_VARIANTS } from '@/constants/theme';

export default function StatusLED({ color = 'zinc', size = 'md', className = "" }) {
  const variant = COLOR_VARIANTS[color] || COLOR_VARIANTS.zinc;
  
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2'
  };

  return (
    <div 
      className={`
        rounded-full animate-pulse 
        ${variant.bg} 
        ${variant.shadow} 
        ${sizeClasses[size]} 
        ${className}
      `} 
    />
  );
}

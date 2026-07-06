interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export default function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const baseClass = "animate-pulse bg-slate-200 dark:bg-white/5";
  
  const variants = {
    text: "h-3 w-full rounded",
    rect: "h-full w-full rounded-lg",
    circle: "h-10 w-10 rounded-full"
  };

  return (
    <div className={`${baseClass} ${variants[variant]} ${className}`} />
  );
}

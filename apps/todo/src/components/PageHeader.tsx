interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-4 md:mb-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      {description && (
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      )}
    </div>
  );
}

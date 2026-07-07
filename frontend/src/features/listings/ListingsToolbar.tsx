import styles from "./ListingsToolbar.module.css";

type ListingsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  activeCount: number;
  onOpenFilters: () => void;
};

export default function ListingsToolbar({
  search,
  onSearchChange,
  activeCount,
  onOpenFilters,
}: ListingsToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <input
        type="search"
        className={styles.search}
        placeholder="Search listings…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <button
        type="button"
        className={styles.filterBtn}
        onClick={onOpenFilters}
      >
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>
    </div>
  );
}

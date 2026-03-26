export default function CategoryPage({ category }) {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{category.charAt(0).toUpperCase() + category.slice(1)} Expenses</h2>
      <p style={styles.placeholder}>Detail view coming soon.</p>
    </div>
  );
}

const styles = {
  container: { padding: 32, fontFamily: 'sans-serif' },
  title: { fontSize: 20, fontWeight: 700, color: '#e2e8f0', margin: '0 0 16px' },
  placeholder: { color: '#94a3b8', fontSize: 14 },
};

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home title', () => {
  render(<App />);
  const titulo = screen.getByText(/o que você quer (assistir|consumir) hoje\?/i);
  expect(titulo).toBeInTheDocument();
});

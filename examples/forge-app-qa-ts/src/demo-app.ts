const shell = (script: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Forge Cart</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #080b12; color: #eef2ff; }
      main { width: min(560px, 86vw); padding: 42px; border: 1px solid #293244; border-radius: 24px; background: linear-gradient(145deg, #151b28, #0c1019); box-shadow: 0 24px 80px #0008; }
      .eyebrow { color: #7dd3fc; text-transform: uppercase; letter-spacing: .18em; font-size: 12px; }
      h1 { font-size: 44px; margin: 8px 0 12px; }
      p { color: #9ca9bd; }
      output { display: block; font-size: 72px; font-weight: 800; margin: 28px 0; }
      button { border: 0; border-radius: 12px; padding: 13px 18px; margin-right: 10px; font-weight: 700; cursor: pointer; }
      [data-testid=add-item] { background: #38bdf8; color: #07111a; }
      [data-testid=reset-cart] { background: #273244; color: #e5e7eb; }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Solari acceptance fixture</div>
      <h1>Forge Cart</h1>
      <p>Each click must add exactly one item. Reset must return to zero.</p>
      <output data-testid="cart-count">0</output>
      <button data-testid="add-item">Add item</button>
      <button data-testid="reset-cart">Reset</button>
    </main>
    <script>${script}</script>
  </body>
</html>`

export const BROKEN_APP = shell(`
  let count = 0;
  const output = document.querySelector('[data-testid=cart-count]');
  document.querySelector('[data-testid=add-item]').addEventListener('click', () => {
    count += 2; // Deliberate production regression: double increment.
    output.textContent = String(count);
  });
  document.querySelector('[data-testid=reset-cart]').addEventListener('click', () => {
    output.textContent = '0'; // Deliberate state bug: count itself is not reset.
  });
`)

export const REPAIRED_APP = shell(`
  let count = 0;
  const output = document.querySelector('[data-testid=cart-count]');
  const render = () => { output.textContent = String(count); };
  document.querySelector('[data-testid=add-item]').addEventListener('click', () => {
    count += 1;
    render();
  });
  document.querySelector('[data-testid=reset-cart]').addEventListener('click', () => {
    count = 0;
    render();
  });
`)

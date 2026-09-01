import re

with open('css/style.css', 'r') as f:
    css = f.read()

# 1. Root Variables
css = re.sub(
    r':root \{.*?(?=\})', 
    """:root {
    /* Primary Colors */
    --clr-primary: #38bdf8;
    --clr-accent: #8b5cf6;
    --clr-highlight: #06b6d4;
    --clr-success: #f97316;
    --clr-white: #ffffff;
    
    /* Secondary Colors */
    --clr-bg-main: #020617;
    --clr-bg-card: #0f172a;
    --clr-text-main: #f8fafc;
    --clr-text-muted: #94a3b8;
    --clr-hover-light: rgba(139, 92, 246, 0.15);

    /* Gradients */
    --grad-hero: linear-gradient(135deg, #020617, #0f172a, #172554);
    --grad-btn: linear-gradient(135deg, var(--clr-accent), var(--clr-highlight));
    --grad-success: linear-gradient(135deg, var(--clr-highlight), var(--clr-success));

    /* Typography */
    --font-heading: 'Inter', sans-serif;
    --font-body: 'Inter', sans-serif;
    --font-accent: 'JetBrains Mono', monospace;

    /* Spacing & Utilities */
    --border-radius: 12px;
    --transition-fast: 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    --transition-med: 0.4s ease-out;
""", css, flags=re.DOTALL)

# 2. General adjustments
css = css.replace('background-color: var(--clr-white);', 'background-color: var(--clr-bg-main);')
css = css.replace('color: var(--clr-primary);', 'color: var(--clr-text-main);')
css = css.replace('color: #475569;', 'color: var(--clr-text-muted);')

# 3. Header
css = css.replace('background: rgba(255, 255, 255, 0.1);', 'background: rgba(2, 6, 23, 0.5);')
css = css.replace('border-bottom: 1px solid rgba(255, 255, 255, 0.1);', 'border-bottom: 1px solid rgba(255, 255, 255, 0.05);')
css = css.replace('background: rgba(255, 255, 255, 0.95);', 'background: rgba(2, 6, 23, 0.95);')
css = css.replace('box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);', 'box-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);')

# 4. Hero
css = css.replace('color: #64748b;', 'color: var(--clr-text-muted);')

# 5. Problem Section
css = css.replace('background: linear-gradient(135deg, #0f172a, var(--clr-primary));', 'background: linear-gradient(135deg, #020617, #0f172a);')
css = css.replace('color: #cbd5e1;', 'color: var(--clr-text-muted);')

# 6. Solution Section
css = css.replace('background: #fdfdfd;', 'background: var(--clr-bg-main);')
css = css.replace('radial-gradient(#e2e8f0 1px', 'radial-gradient(rgba(255,255,255,0.1) 1px')
css = css.replace('background: white; padding: 1.5rem;', 'background: var(--clr-bg-card); padding: 1.5rem;')
css = css.replace('border: 1px solid #f1f5f9;', 'border: 1px solid rgba(255,255,255,0.05);')
css = css.replace('box-shadow: 0 4px 6px rgba(0,0,0,0.05);', 'box-shadow: 0 4px 20px rgba(0,0,0,0.4);')
css = css.replace('box-shadow: 0 10px 25px rgba(0,0,0,0.1);', 'box-shadow: 0 10px 30px rgba(0,0,0,0.6);')

# 7. Timeline
css = css.replace('background: linear-gradient(180deg, #f8fafc, white);', 'background: linear-gradient(180deg, var(--clr-bg-main), #0f172a);')
css = css.replace('background: white; padding: 2rem;', 'background: var(--clr-bg-card); padding: 2rem; border: 1px solid rgba(255,255,255,0.05);')

# 8. Features
css = css.replace('background: #0f172a;', 'background: #020617;')

# 9. Why Us
css = css.replace('background: linear-gradient(135deg, white, #f3f4f6);', 'background: linear-gradient(135deg, #0f172a, var(--clr-bg-main));')
css = css.replace('background: white; padding: 2rem;', 'background: var(--clr-bg-card); padding: 2rem; border: 1px solid rgba(255,255,255,0.05);')
css = css.replace('background: white; border-radius: 16px;', 'background: var(--clr-bg-card); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);')
css = css.replace('border-bottom: 1px solid #e2e8f0;', 'border-bottom: 1px solid rgba(255,255,255,0.1);')

# 10. FAQ
css = css.replace('background: white; }', 'background: var(--clr-bg-main); }')
css = css.replace('background: #f8fafc;', 'background: var(--clr-bg-card);')
css = css.replace('color: #64748b;', 'color: var(--clr-text-muted);')

with open('css/style.css', 'w') as f:
    f.write(css)

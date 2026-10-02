/**
 * The ✳ used across the site, drawn as a vector rather than a font character: its
 * center is the exact center of its 1em box on every device, so the hover spin
 * (.star-spin) turns it in place. Takes the surrounding text color and size.
 */
export default function Asterisk() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false" className="block">
      <path
        // Sized to match the font ✳ it replaces: spokes reach 8.5 of the 12-unit radius.
        d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
    </svg>
  );
}

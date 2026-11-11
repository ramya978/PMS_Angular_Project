// In-house Guests (FD-07): the filter chips and the top-bar search filter the 50 rows.
// The rules are read from the cells already on the page, and they reproduce the chip counts:
// Due out today 8, Due out tomorrow 11, Foreign/OCI 12, VIP & Gold+ 9, Arrived today 2,
// Company billed 7, Over credit limit 1.

const TODAY = '22 Oct';
const TOMORROW = '23 Oct';
const NATIONALITIES = ['Saudi', 'Emirati', 'Canadian', 'French', 'British', 'German', 'Swedish', 'Italian'];

interface RowInfo {
  el: HTMLTableRowElement;
  arrival: string;
  departure: string;
  text: string;
  nat: boolean;
  vip: boolean;
  comp: boolean;
  over: boolean;
}

const FILTERS: Record<string, (r: RowInfo) => boolean> = {
  'f-all': () => true,
  'f-dot': (r) => r.departure === TODAY,
  'f-tom': (r) => r.departure === TOMORROW,
  'f-for': (r) => r.nat,
  'f-vip': (r) => r.vip,
  'f-new': (r) => r.arrival === TODAY,
  'f-comp': (r) => r.comp,
  'f-over': (r) => r.over,
};

function rupees(text: string): number | null {
  const m = text.replace(/,/g, '').match(/₹\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

export function mountFd07(root: HTMLElement): void {
  const rows: RowInfo[] = Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr.ih-r')).map((el) => {
    const cells = Array.from(el.querySelectorAll('td'));
    const dates = (cells[2]?.textContent ?? '').match(/(\d+ [A-Za-z]{3})\s*→\s*(\d+ [A-Za-z]{3})/);
    const guestCell = cells[1];
    const name = guestCell?.querySelector('strong')?.textContent ?? '';
    const tags = (guestCell?.textContent ?? '').replace(name, '');
    const balance = rupees(cells[4]?.textContent ?? '');
    const depositText = (cells[5]?.textContent ?? '').trim();
    const deposit = depositText.startsWith('₹') ? rupees(depositText) : null;
    const billTo = (cells[7]?.textContent ?? '').trim();
    return {
      el,
      arrival: dates?.[1] ?? '',
      departure: dates?.[2] ?? '',
      text: (el.textContent ?? '').toLowerCase(),
      nat: NATIONALITIES.some((n) => tags.includes(n)),
      vip: /Gold|Platinum|VIP/.test(tags),
      comp: !billTo.startsWith('Guest'),
      over: balance !== null && deposit !== null && balance > deposit,
    };
  });

  const chips = Array.from(root.querySelectorAll<HTMLAnchorElement>('.ih-chips a.rb-chip'));
  let filter = 'f-all';
  let query = '';

  const apply = (): void => {
    for (const r of rows) {
      const show = FILTERS[filter](r) && (query === '' || r.text.includes(query));
      r.el.style.display = show ? '' : 'none';
    }
  };

  root.addEventListener('click', (event) => {
    const chip = (event.target as Element | null)?.closest?.('.ih-chips a.rb-chip') as HTMLAnchorElement | null;
    if (!chip) return;
    const key = (chip.getAttribute('href') ?? '').replace('#', '');
    if (!(key in FILTERS)) return;
    event.preventDefault();
    filter = key;
    for (const c of chips) {
      const active = c === chip;
      c.classList.toggle('is-active', active);
      c.setAttribute('aria-current', active ? 'true' : 'false');
    }
    apply();
  });

  const search = root.querySelector<HTMLInputElement>('.topbar__search-input');
  search?.addEventListener('input', () => {
    query = search.value.trim().toLowerCase();
    apply();
  });

  apply();
}

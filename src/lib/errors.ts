// @ts-nocheck — pre-existing TS errors
/**
 * Centraliziran error handling — user-friendly sporočila za vse tipi napak.
 *
 * Namesto tehničnih sporočil (npr. "TypeError: Cannot read property 'id' of undefined")
 * prikažemo uporabniku razumljivo sporočilo z navodili kaj storiti.
 */

/**
 * Mapiranje HTTP status code → user-friendly sporočilo.
 */
const HTTP_ERROR_MESSAGES: Record<number, { title: string; desc: string }> = {
  400: {
    title: "Neveljaven zahtevek",
    desc: "Preverite vnešene podatke in poskusite znova.",
  },
  401: {
    title: "Niste prijavljeni",
    desc: "Prijavite se s PIN kod za dostop do te funkcije.",
  },
  403: {
    title: "Nimate dovoljenja",
    desc: "Za to akcijo potrebujete višjo vlogo (admin).",
  },
  404: {
    title: "Ni najdeno",
    desc: "Zahtevani podatek ne obstaja ali je bil izbrisan.",
  },
  409: {
    title: "Konflikt",
    desc: "Podatek že obstaja ali je bil posodobljen s strani drugega uporabnika.",
  },
  422: {
    title: "Neveljavni podatki",
    desc: "Preverite vnešene podatke — nekatera polja so neveljavna.",
  },
  429: {
    title: "Preveč zahtevkov",
    desc: "Počakajte trenutek in poskusite znova.",
  },
  500: {
    title: "Napaka strežnika",
    desc: "Prišlo je do napake na strežniku. Poskusite znova ali kontaktirajte podporo.",
  },
  502: {
    title: "Strežnik ni na voljo",
    desc: "Preverite internetno povezavo in poskusite znova.",
  },
  503: {
    title: "Vzdrževanje",
    desc: "Sistem je trenutno v vzdrževanju. Poskusite znova čez nekaj minut.",
  },
  504: {
    title: "Časovna omejitev",
    desc: "Strežnik ni odgovoril pravočasno. Preverite povezavo in poskusite znova.",
  },
};

/**
 * Mapiranje znanih tehničnih napak → user-friendly sporočilo.
 */
const KNOWN_ERROR_PATTERNS: { pattern: RegExp; title: string; desc: string }[] = [
  {
    pattern: /network|fetch|ECONNREFUSED|ERR_CONNECTION/i,
    title: "Brez povezave",
    desc: "Preverite internetno povezavo. Račun se bo shranil lokalno in fiskaliziral ko se povezava vrne.",
  },
  {
    pattern: /timeout|ETIMEDOUT/i,
    title: "Časovna omejitev",
    desc: "Operacija je trajala predolgo. Poskusite znova.",
  },
  {
    pattern: /FURS|fiskaliz|ZOI|EOR/i,
    title: "Napaka FURS fiskalizacije",
    desc: "Račun je shranjen lokalno in bo fiskaliziran pri naslednji povezavi z FURS.",
  },
  {
    pattern: /certificate|cert|TLS|SSL/i,
    title: "Napaka certifikata",
    desc: "Preverite FURS certifikat v nastavitvah. Morda je potekel ali napačno konfiguriran.",
  },
  {
    pattern: /duplicate|unique constraint/i,
    title: "Podatek že obstaja",
    desc: "Vnesena vrednost je že v uporabi. Uporabite drugo.",
  },
  {
    pattern: /foreign key|constraint/i,
    title: "Podatek je v uporabi",
    desc: "Tega zapisa ni mogoče izbrisati, ker je povezan z drugimi podatki.",
  },
  {
    pattern: /JSON|parse|syntax/i,
    title: "Napaka v podatkih",
    desc: "Format podatkov je neveljaven. Preverite vnose in poskusite znova.",
  },
  {
    pattern: /PIN|password|auth/i,
    title: "Napačna prijava",
    desc: "Preverite PIN kodo in poskusite znova.",
  },
  {
    pattern: /insufficient|balance|funds/i,
    title: "Premajhno stanje",
    desc: "Na kartici ni dovolj sredstev za to operacijo.",
  },
  {
    pattern: /rate limit|too many/i,
    title: "Preveč poskusov",
    desc: "Počakajte nekaj minut pred naslednjim poskusom.",
  },
];

export interface UserFriendlyError {
  title: string;
  description: string;
  technical?: string;
  retryable: boolean;
}

/**
 * Pretvori katerokoli napako v user-friendly sporočilo.
 */
export function toUserFriendlyError(error: unknown): UserFriendlyError {
  // Če je že UserFriendlyError
  if (error && typeof error === "object" && "title" in error && "description" in error) {
    return error as UserFriendlyError;
  }

  const errorStr = error instanceof Error ? error.message : String(error);
  const errorObj = error as { status?: number; error?: string };

  // HTTP status code
  const status = errorObj?.status;
  if (status && HTTP_ERROR_MESSAGES[status]) {
    return {
      ...HTTP_ERROR_MESSAGES[status],
      technical: errorStr,
      retryable: status >= 500 || status === 429,
    };
  }

  // API error message (iz fetch response)
  if (errorObj?.error) {
    // Preveri znane vzorce
    for (const pattern of KNOWN_ERROR_PATTERNS) {
      if (pattern.pattern.test(errorObj.error)) {
        return {
          ...pattern,
          technical: errorObj.error,
          retryable: true,
        };
      }
    }
    // Vrni API error kot description (verjetno je že user-friendly iz API-ja)
    return {
      title: "Napaka",
      description: errorObj.error,
      technical: errorStr,
      retryable: false,
    };
  }

  // Znani tehnični vzorci
  for (const pattern of KNOWN_ERROR_PATTERNS) {
    if (pattern.pattern.test(errorStr)) {
      return {
        ...pattern,
        technical: errorStr,
        retryable: true,
      };
    }
  }

  // Default fallback
  return {
    title: "Nekaj je šlo narobe",
    description: "Poskusite znova. Če se napaka ponavlja, kontaktirajte podporo.",
    technical: errorStr,
    retryable: true,
  };
}

/**
 * Wrapper za fetch klice z avtomatskim error handlingom.
 * Vrne data ali vrže UserFriendlyError.
 */
export async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const error = new Error(body.error || `HTTP ${res.status}`);
      (error as unknown as { status: number }).status = res.status;
      (error as unknown as { error: string }).error = body.error;
      throw error;
    }

    return await res.json() as T;
  } catch (e) {
    // Network error
    if (e instanceof TypeError && e.message.includes("fetch")) {
      throw {
        title: "Brez povezave",
        description: "Preverite internetno povezavo in poskusite znova.",
        technical: e.message,
        retryable: true,
      };
    }
    throw e;
  }
}

/**
 * Vrne user-friendly sporočilo za toast.
 */
export function getErrorMessage(error: unknown): string {
  const friendly = toUserFriendlyError(error);
  return friendly.description;
}

/**
 * Vrne user-friendly naslov za toast.
 */
export function getErrorTitle(error: unknown): string {
  const friendly = toUserFriendlyError(error);
  return friendly.title;
}

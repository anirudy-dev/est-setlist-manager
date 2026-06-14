/**
 * /api/venue-scout — server-side venue research.
 *
 * Calls the Anthropic API with the web-search tool to research a venue and
 * synthesize a structured intelligence brief. Returns JSON the client renders
 * in VenueScoutModal and saves to venue_profiles.
 *
 * Required env: ANTHROPIC_API_KEY
 *
 * Why server-side: the API key must not ship to the browser, and the call
 * may take 10-30 seconds which is fine for a non-streaming server route but
 * unsuitable for client-side fetch chains.
 */

export const runtime = 'nodejs';
export const maxDuration = 60; // give the model time to search + synthesize

interface ScoutRequest {
  venueName: string;
  city?: string;
}

export interface ScoutBrief {
  venue_name: string;
  city: string | null;
  typical_crowd_age_range: string | null;
  capacity_estimate: number | null;
  observed_peak_time: string | null;      // "HH:MM:SS" 24h
  vibe: string | null;                     // one-line vibe description
  recommended_crowd_model_id: string | null;
  music_notes: string[];                   // what's worked / what hasn't
  do_list: string[];                       // banter cues, song hooks
  dont_list: string[];                     // landmines
  sources: string[];                       // URLs the model used
  raw_summary: string;                     // a one-paragraph human read
}

const CROWD_MODEL_IDS = [
  'late_night_bar_3set_10to2',
  'wedding_reception_4set_8to12',
  'cocktail_hour_2set_6to9',
  'festival_patio_2set_3to6',
  'corporate_private_3set_8to11',
  'brewery_taproom_2set_7to10',
];

const SYSTEM_PROMPT = `You are EST's venue scout. EST is a cover band playing in the Toronto area (mid + downtown Toronto, plus Barrie and Whitby). Your job: research a specific venue and produce intelligence the band can use to tailor their setlist and banter.

Use the web search tool aggressively. Look for:
  - Google Maps reviews (last 1-2 years)
  - The venue's Instagram and Facebook presence
  - Local press / news / blog mentions
  - Setlist.fm or similar (if it's the kind of venue that gets logged)
  - Reddit local subreddit mentions

Extract:
  1. CROWD DEMO — age range, vibe (after-work / college / older / mixed / cocktail / dive)
  2. CAPACITY — rough estimate
  3. PEAK TIME — when does the room fill (e.g., "10pm-1am peaks at 12:15")
  4. MUSIC HISTORY — bands that have played there, songs that have worked, songs that have flopped
  5. COMPLAINTS — volume, music choices, anything to avoid
  6. DELIGHT SIGNALS — bartender / owner names, regulars, local trivia, things to drop in banter
  7. CROWD MODEL — pick from: ${CROWD_MODEL_IDS.join(', ')}

Output STRICTLY as JSON matching the schema given to you. No prose outside JSON. If a field is unknown, use null or an empty array. Be honest about what the web search did and didn't reveal.`;

const OUTPUT_SCHEMA_HINT = `{
  "venue_name": string,
  "city": string | null,
  "typical_crowd_age_range": string | null,
  "capacity_estimate": number | null,
  "observed_peak_time": string | null,         // "HH:MM:SS" 24h, e.g. "00:15:00" for 12:15am
  "vibe": string | null,                        // one-line, e.g. "after-work pub, fills late on weekends"
  "recommended_crowd_model_id": string | null, // one of the six listed
  "music_notes": string[],                      // bullet observations
  "do_list": string[],                          // banter cues + song hooks
  "dont_list": string[],                        // landmines
  "sources": string[],                          // URLs you actually used
  "raw_summary": string                         // one paragraph the band can read in 30s
}`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: 'ANTHROPIC_API_KEY not configured',
        hint: 'Add ANTHROPIC_API_KEY to Vercel env vars and redeploy. Get a key at console.anthropic.com.',
      },
      { status: 503 },
    );
  }

  let body: ScoutRequest;
  try {
    body = (await req.json()) as ScoutRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.venueName?.trim()) {
    return Response.json({ error: 'venueName is required' }, { status: 400 });
  }

  const userPrompt =
    `Venue to scout: "${body.venueName}"${body.city ? ` in ${body.city}` : ''}.\n\n` +
    `Use the web search tool. Return JSON matching this schema:\n${OUTPUT_SCHEMA_HINT}\n\n` +
    `Return ONLY the JSON object, no markdown fences, no commentary.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 8,
          },
        ],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return Response.json(
        { error: `Anthropic API error ${resp.status}`, details: text.slice(0, 800) },
        { status: 502 },
      );
    }

    const data = (await resp.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    // Find the text block(s) and extract the JSON.
    const text =
      data.content
        ?.filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('\n')
        .trim() ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: 'Scout returned no JSON', raw: text.slice(0, 800) },
        { status: 502 },
      );
    }

    let brief: ScoutBrief;
    try {
      brief = JSON.parse(jsonMatch[0]) as ScoutBrief;
    } catch (e) {
      return Response.json(
        { error: 'Scout JSON failed to parse', raw: jsonMatch[0].slice(0, 800) },
        { status: 502 },
      );
    }

    return Response.json({ brief });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Scout failed' },
      { status: 500 },
    );
  }
}

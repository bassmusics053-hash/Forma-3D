/** Safely decode API JSON and preserve helpful diagnostics if a route returns no JSON. */
export async function readApiJson(response: Response): Promise<any> {
  const raw = await response.text();
  let data: any;
  if (!raw.trim()) {
    throw new Error(`Server bo‘sh javob qaytardi (${response.status}). API: ${new URL(response.url).pathname}. VS Code terminalini tekshiring.`);
  }
  try {
    data = JSON.parse(raw);
  } catch {
    const type = response.headers.get("content-type") || "noma’lum";
    throw new Error(`Server JSON o‘rniga boshqa javob qaytardi (${response.status}; ${type}). API: ${new URL(response.url).pathname}. VS Code terminalidagi server xatosini tekshiring.`);
  }
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : `API xatosi: ${response.status} (${new URL(response.url).pathname})`);
  }
  return data;
}

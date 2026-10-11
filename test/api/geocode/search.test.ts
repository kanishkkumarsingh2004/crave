import { GET } from '@/app/api/geocode/search/route'

describe('/api/geocode/search API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = jest.fn()
  })

  test('returns 400 when search query is empty or less than 2 characters', async () => {
    const req = new Request('http://localhost/api/geocode/search?q=a')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/at least 2 characters/i)
  })

  test('returns parsed and mapped location suggestions from Nominatim', async () => {
    const mockNominatimResults = [
      {
        place_id: 123456,
        osm_id: 78910,
        osm_type: 'way',
        lat: '12.9716',
        lon: '77.5946',
        display_name: 'MG Road, Shivajinagar, Bengaluru, Karnataka, 560001, India',
        name: 'MG Road',
        type: 'primary',
        address: {
          road: 'MG Road',
          suburb: 'Shivajinagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          postcode: '560001',
          country: 'India',
        },
      },
    ]

    ;((global as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNominatimResults,
    })

    const req = new Request('http://localhost/api/geocode/search?q=MG%20Road')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.results).toHaveLength(1)
    expect(json.results[0].name).toBe('MG Road')
    expect(json.results[0].lat).toBe(12.9716)
    expect(json.results[0].lng).toBe(77.5946)
    expect(json.results[0].city).toBe('Bengaluru')
  })

  test('handles upstream fetch timeout or error gracefully with empty results', async () => {
    ;((global as any).fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'))

    const req = new Request('http://localhost/api/geocode/search?q=Koramangala')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.results).toEqual([])
  })
})

interface SearchConfig {
    regex: boolean
    type: string
}

interface SearchBody {
    keyword: string
    config?: SearchConfig
}

export type { SearchBody, SearchBody }
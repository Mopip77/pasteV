interface SearchConfig {
    regex: boolean
}

interface SearchBody {
    keyword: string
    config?: SearchConfig
}

export type { SearchBody, SearchBody }
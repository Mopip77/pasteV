interface SearchConfig {
    regex: boolean
}

interface SearchBody {
    keyword: string
    config?: SearchConfig
}

export type { SearchContext, SearchBody }
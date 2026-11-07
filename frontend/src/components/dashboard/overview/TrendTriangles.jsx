export function TrendUpTriangle({ size = 12, className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M21,21H3L12,3Z" />
        </svg>
    )
}

export function TrendDownTriangle({ size = 12, className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <g transform="matrix(-1, 0, 0, -1, 24, 24)">
                <path d="M21,21H3L12,3Z" />
            </g>
        </svg>
    )
}
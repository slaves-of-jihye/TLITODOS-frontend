import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/*
 * FSD 레이어는 아래에서 위로만 흐릅니다.
 *
 * shared -> entities -> features -> widgets -> pages -> app. 아래 층은 위 층을
 * 몰라야 하고, 같은 층끼리도 서로를 몰라야 합니다 — 두 슬라이스가 같은 조각을
 * 쓰게 되면 그 조각이 아래층으로 내려가야 한다는 뜻이기 때문입니다.
 *
 * 레이어를 건너는 수입은 늘 `@/` 별칭을 씁니다. `../../`로 기어 올라가면 어느
 * 층을 부르는지 경로만 봐서는 읽히지 않고, 아래 규칙도 피해 갑니다. 그래서 슬라이스
 * 밖으로 나가는 상대 경로 자체를 막습니다 — 슬라이스 안에서는 `./`와 `../`로 충분합니다.
 */
const LAYERS = ['shared', 'entities', 'features', 'widgets', 'pages', 'app']

const escapesSlice = {
  group: ['../../*', '../../**'],
  message: '레이어를 건널 때는 @/ 별칭을 쓰세요. 상대 경로로는 어느 층인지 읽히지 않습니다.',
}

/**
 * 그 층이 몰라야 하는 것들: 자기보다 위층 전부와, 자기 층의 다른 슬라이스.
 *
 * shared만 예외입니다 — 도메인으로 갈린 슬라이스가 없고 `ui`/`lib`/`api`라는
 * 조각으로만 나뉘므로, 그 조각끼리는 서로를 불러도 됩니다.
 */
const boundaries = LAYERS.map((layer, index) => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              ...LAYERS.slice(index + 1).map(above => `@/${above}/**`),
              ...(layer === 'shared' ? [] : [`@/${layer}/**`]),
            ],
            message: `${layer} 층은 자기보다 위층과 같은 층의 다른 슬라이스를 몰라야 합니다.`,
          },
          escapesSlice,
        ],
      },
    ],
  },
}))

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  ...boundaries,
])

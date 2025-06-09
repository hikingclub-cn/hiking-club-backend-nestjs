// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
      // 建议明确忽略构建产物和 node_modules
      ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
    },
    eslint.configs.recommended, // ESLint 官方推荐的基本规则
    ...tseslint.configs.recommendedTypeChecked, // TypeScript ESLint 推荐的类型检查相关规则
    // 如果觉得 recommendedTypeChecked 过于严格，可以考虑使用不带类型检查的 recommended：
    // ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended, // Prettier 插件，确保和 Prettier 格式化规则兼容
    {
      languageOptions: {
        globals: {
          ...globals.node,
          ...globals.jest, // 如果你使用 Jest 进行测试
        },
        sourceType: 'commonjs', // NestJS 项目通常是 commonjs
        parserOptions: {
          project: true, // 或者指定为 ['./tsconfig.json', './tsconfig.node.json'] 等具体路径
          tsconfigRootDir: import.meta.dirname,
        },
      },
      // 在这里集中配置你想要调整的规则
      rules: {
        // ---------------- 原有规则调整建议 ----------------
        '@typescript-eslint/no-explicit-any': 'off', // 你已经关闭了 any 类型的报错，这会显著减少报错

        // 对于异步操作，如果不想强制处理 Promise 的 reject，可以设为 'off'
        // 但 'warn' 至少能提醒你潜在的未处理的 Promise
        '@typescript-eslint/no-floating-promises': 'warn', // 或者 'off'

        // 对于 unsafe argument，如果信任传入参数的类型，可以设为 'off'
        '@typescript-eslint/no-unsafe-argument': 'warn', // 或者 'off'

        // ---------------- 新增/修改规则以减少报错 ----------------

        // 1. 未使用的变量 (Unused variables)
        // 原始的 'no-unused-vars' 需要禁用，使用 TypeScript ESLint 的版本
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'warn', // 将错误降级为警告
          {
            argsIgnorePattern: '^_', // 忽略以 _ 开头的参数
            varsIgnorePattern: '^_', // 忽略以 _ 开头的变量
            caughtErrorsIgnorePattern: '^_', // 忽略以 _ 开头的 catch 错误对象
          },
        ],

        // 2. 函数返回类型 (Explicit function return types)
        // 如果不想强制声明每个函数的返回类型，可以关闭
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',

        // 3. any 类型相关的 "unsafe" 操作
        // recommendedTypeChecked 中这些规则比较严格，如果大量使用 any，可能会有很多报错
        // 可以考虑将它们降级为警告，或者在确认风险可控的情况下关闭
        '@typescript-eslint/no-unsafe-assignment': 'warn', // any 类型赋值给其他变量
        '@typescript-eslint/no-unsafe-call': 'warn',       // 调用 any 类型的函数
        '@typescript-eslint/no-unsafe-member-access': 'warn', // 访问 any 类型对象的属性
        '@typescript-eslint/no-unsafe-return': 'warn',     // 从函数返回 any 类型

        // 4. 非空断言 (Non-null assertion)
        // 如果你确定某个值不会是 null 或 undefined，可以使用 ! 操作符
        // 但滥用可能导致运行时错误，所以默认是禁止的。可以根据情况开启或降为警告。
        '@typescript-eslint/no-non-null-assertion': 'off', // 或者 'warn'

        // 5. 要求 await (Require await)
        // 如果 async 函数中没有 await 表达式，会报错。可以降为警告或关闭。
        // '@typescript-eslint/require-await': 'warn',

        // Prettier 相关的规则由 eslint-plugin-prettier/recommended 处理，通常不需要额外配置
        // 'prettier/prettier': 'warn', // 如果想把 Prettier 问题视为警告而非错误

        // ---------------- 其他你可能想要调整的规则 ----------------
        // 示例：允许空函数
        // '@typescript-eslint/no-empty-function': 'off',

        // 示例：允许特定的命名约定 (如果你有自己的偏好)
        // '@typescript-eslint/naming-convention': 'off',
      },
    },
    // 你也可以为特定文件或目录覆盖规则
    // 例如，测试文件可能允许更多的灵活性
    // {
    //   files: ['**/*.spec.ts', '**/*.test.ts'],
    //   rules: {
    //     '@typescript-eslint/no-unsafe-assignment': 'off',
    //     '@typescript-eslint/no-explicit-any': 'off',
    //     '@typescript-eslint/no-non-null-assertion': 'off',
    //   }
    // }
);
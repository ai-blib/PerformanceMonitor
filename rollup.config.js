import typescript from 'rollup-plugin-typescript2';

import { terser } from 'rollup-plugin-terser';
import cleanup from "rollup-plugin-cleanup"; // 去除无效代码
import commonjs from "rollup-plugin-commonjs";
import babel from 'rollup-plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/performance-monitor.esm.js',
            format: 'iife',
            sourcemap: false
        }
    ],
    plugins: [
        resolve(),
        commonjs(),
        babel(),
        cleanup(),
        typescript({ tsconfig: './tsconfig.json' }),
        terser(),
    ]
};

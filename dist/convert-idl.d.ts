import * as ts from 'typescript';
import * as webidl2 from 'webidl2';
import { Options } from './types';
export declare function convertIDL(rootTypes: webidl2.IDLRootType[], options?: Options): ts.Statement[];

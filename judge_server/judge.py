#!/usr/bin/env python3
# coding: UTF-8
import argparse
import json
import os
import shlex
import subprocess
from enum import Enum
from typing import Tuple

CONFIG_PATH = 'source/config.json'
RESULT_PATH = 'output/result.json'

SIGNALS = {
    1: 'SIGHUP (Hangup detected on controlling terminal or death of controlling process)',
    2: 'SIGINT (Interrupt from keyboard. CTRL+C)',
    3: 'SIGQUIT (Quit from keyboard)',
    4: 'SIGILL (Illegal Instruction)',
    6: 'SIGABRT\nAbort (It\'s mainly sent by the library because of incorrect user source code.)',
    8: 'SIGFPE (Floating-point exception)',
    9: 'SIGKILL (Kill signal)',
    11: 'SIGSEGV\n'
        'Segmentation fault (Invalid memory reference. It\'s mainly because of wrong reference of pointer or array)',
    13: 'SIGPIPE (Broken pipe: write to pipe with no readers',
    14: 'SIGALRM (Timer signal from alarm(2))',
    15: 'SIGTERM (Termination signal)'
}


class Type(Enum):
    CORRECT = 1
    INCORRECT = 2
    COMPILE_ERROR = 3
    TIMEOUT = 4
    RUNTIME_ERROR = 5
    SCRIPT_ERROR = 6


def write_result(result_type: Type, failed_index: int = None, return_code: int = None, user_output: str = None,
                 runtime_error: str = None, script_error: str = None, compile_error: str = None) -> None:
    obj = {
        'type': result_type.value, 'failedIndex': failed_index, 'returnCode': return_code,
        'userOutput': user_output, 'runtimeError': runtime_error, 'scriptError': script_error,
        'compileError': compile_error
    }

    obj = {k: v for k, v in obj.items() if v is not None}

    with open(RESULT_PATH, 'w') as result_p:
        json.dump(obj, result_p, ensure_ascii=False)


def get_compile_command(config: dict) -> Tuple[str, ...]:
    language = config['language']
    compiles = config['compile']

    if language == 'cpp':
        return ('g++', '-o', '../a.out', '-w', '-O3', '-std=c++14', *compiles)
    elif language == 'java':
        return ('javac', *compiles, '-encoding', 'UTF-8', '-d', '../')
    elif language == 'make':
        return 'make',
    else:
        raise ValueError("language (value : {}) is not in ('cpp', 'java', 'make')".format(language))


def get_run_command(config: dict) -> str:
    language = config['language']

    if language == 'cpp':
        return './a.out'
    elif language == 'java':
        return 'java {}'.format(config['entryPoint'])
    elif language == 'make':
        return 'make'
    else:
        raise ValueError("language (value : {}) is not in ('cpp', 'java', 'make')".format(language))


def compile_and_check(config: dict) -> None:
    cmd = get_compile_command(config)

    result = subprocess.run(cmd, cwd='./source', stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    if result.returncode is 0:
        if config['language'] == 'java' and not os.path.isfile(config['entryPoint'] + '.class'):
            write_result(Type.SCRIPT_ERROR,
                         script_error='Can not find {} class.\n'
                                      'You must remove the package definition from the source code.'
                         .format(config['entryPoint']))
            exit(0)

    else:
        write_result(Type.COMPILE_ERROR, compile_error=result.stderr.decode().rstrip())
        exit(0)


def run_and_save(config: dict) -> int:
    compile_and_check(config)

    cmd = get_run_command(config)

    # FIXME: args and stdin option from config.json
    # start judging!
    for idx in range(config['testSetSize']):
        # open answer input and output
        with open('input/{}.in'.format(idx)) as in_fp, \
                open('answer/{}.out'.format(idx)) as ans_fp:

            try:
                # TODO: pass trough program argument
                result = subprocess.run(shlex.split(cmd), timeout=config['timeout'],
                                        stdin=in_fp, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            # timeout
            except subprocess.TimeoutExpired:
                write_result(Type.TIMEOUT, failed_index=idx)
                return 0

            # runtime error
            if result.returncode < 0:
                if -result.returncode in SIGNALS:
                    write_result(Type.RUNTIME_ERROR, return_code=result.returncode,
                                 failed_index=idx, runtime_error=SIGNALS[-result.returncode])
                    return result.returncode

                else:
                    write_result(Type.RUNTIME_ERROR, return_code=result.returncode, failed_index=idx)
                    raise ValueError('{} is unrecognizable signal.'.format(-result.returncode))

            # unknown exit code
            elif result.returncode is not 0:
                write_result(Type.SCRIPT_ERROR, return_code=result.returncode, failed_index=idx)
                raise ValueError('{} is unrecognizable exit code.'.format(result.returncode))

            # if it runs correctly, make sure it is correct!
            else:
                whole_user_output = result.stdout.decode()

                user_output = whole_user_output.rstrip().split('\n')
                answer = ans_fp.read().rstrip().split('\n')

                if len(user_output) != len(answer):
                    write_result(Type.INCORRECT, failed_index=idx, user_output=whole_user_output)
                    return 0

                for user_line, ans_line in zip(user_output, answer):
                    if user_line.rstrip() != ans_line.rstrip():
                        write_result(Type.INCORRECT, failed_index=idx, user_output=whole_user_output)
                        return 0

    write_result(Type.CORRECT)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='Judging submitted source.')
    parser.add_argument('-C', '--compile-only', action='store_true', help='Only verify that it is compiled')
    args = parser.parse_args()

    with open(CONFIG_PATH) as in_fp:
        config = json.load(in_fp, encoding='UTF-8')

    if args.compile_only:
        compile_and_check(config)
        write_result(Type.CORRECT)
        return 0

    else:
        return run_and_save(config)


if __name__ == '__main__':
    exit(main())

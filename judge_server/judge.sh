#!/usr/bin/env bash

name=`jq -r .sourceName ./source/config.json`
extension=`jq -r .extension ./source/config.json`
inputNum=`jq -r .test_set ./source/config.json`

mkdir tmp

if [ ${extension} = 'cpp' ]; then
	cd ./source
	ret=`file ${name}`
	if [ "${ret/text}" = "$ret" ]; then
		echo "It's not a source code" > ../tmp/compile_error.log
	else
		g++ -o ../a.out -w -O3 -std=c++14 ${name} 2> ../tmp/compile_error.log
	fi
	cd ..

	if [ -f a.out ]; then
		for (( i=1; i <= ${inputNum}; i++ )); do
			timeout 1 ./a.out < ./input/${i}.in > ./tmp/output.log 2> ./tmp/error.log

			./compare.py ./tmp/output.log ./answer/${i}.out ${i} $? ./tmp/error.log

			if [ $? -ne 0 ]; then
				break
			fi
		done
	else
		cp ./tmp/compile_error.log ./output/compile_error.log
	fi

elif [ ${extension} = 'java' ]; then
	cd ./source
	ret=`file ${name}`
	if [ "${ret/text}" = "$ret" ]; then
		echo "It's not a source code" > ../tmp/compile_error.log
	else
		javac ${name} -d ../ 2> ../tmp/compile_error.log
	fi
	cd ..

	if [ -f "${name%.java}.class" ]; then
		for (( i=1; i <= ${inputNum}; i++ )); do
			timeout 3 java ${name%.java} < ./input/${i}.in > ./tmp/output.log 2> ./tmp/error.log

			./compare.py ./tmp/output.log ./answer/${i}.out ${i} $? ./tmp/error.log

			if [ $? -ne 0 ]; then
				break
			fi
		done
	else
		cp ./tmp/compile_error.log ./output/compile_error.log
	fi
fi
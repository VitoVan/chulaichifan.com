(setf sb-impl::*default-external-format* :UTF-8)
(declaim (optimize (debug 3)))
(ql:quickload '(hunchentoot cl-prevalence))
(defpackage clcf
  (:use :cl :hunchentoot))
(in-package :clcf)
;; Start Hunchentoot
(setf *show-lisp-errors-p* t)
(setf *acceptor* (make-instance 'hunchentoot:easy-acceptor
                                :port 8083
                                :access-log-destination "log/access.log"
                                :message-log-destination "log/message.log"
                                :error-template-directory  "www/errors/"
                                :document-root "www/"))
(start *acceptor*)
(defvar *alphabet* "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

(defun number->string(num)
  (if (equal num 0)
      (subseq *alphabet* 0 1)
      (do* ((seq-start 0 (cadr (multiple-value-list (floor number (length *alphabet*)))))
            (seq-end 0 (+ 1 seq-start))
            (seqs "" (concatenate 'string (subseq *alphabet* seq-start seq-end) seqs))
            (number num (car (multiple-value-list (floor (/ number (length *alphabet*)))))))
           ((equal number 0) seqs))))

(defun string->number(str)
  (let ((i 0))
    (map 'string
         #'(lambda (c)
             (setf i (+ (* i (length *alphabet*)) (position c *alphabet*)))
             c)
         str)
    i))

(defun redirect-url(id)
  (format nil "http://m.amap.com/detail/mapview/poiid=~A" id))

(defun controller-redirect ()
  (setf (hunchentoot:content-type*) "text/plain")
  (redirect (redirect-url (subseq (request-uri*) 2))))

(setf *dispatch-table*
      (list (create-regex-dispatcher "^/r*" 'controller-redirect)))

